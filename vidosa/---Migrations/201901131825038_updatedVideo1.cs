namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class updatedVideo1 : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Videos", "Path", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Videos", "Path");
        }
    }
}
