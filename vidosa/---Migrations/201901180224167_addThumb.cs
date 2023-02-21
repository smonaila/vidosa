namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addThumb : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Videos", "Thumb", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Videos", "Thumb");
        }
    }
}
